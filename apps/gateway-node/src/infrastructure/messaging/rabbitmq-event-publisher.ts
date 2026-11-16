import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { connect, type Channel, type ChannelModel } from "amqplib"
import { rabbitmqConfig } from "@/config/configuration.js"
import type { EventPublisher } from "@/domain/contracts/event-publisher.js"

@Injectable()
export class RabbitMqEventPublisher implements EventPublisher, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqEventPublisher.name)
  private connection: ChannelModel | null = null
  private channel: Channel | null = null

  constructor(
    @Inject(rabbitmqConfig.KEY)
    private readonly rmqConfig: ConfigType<typeof rabbitmqConfig>,
  ) {}

  async publish(routingKey: string, payload: unknown): Promise<void> {
    const channel = await this.getChannel()

    await channel.assertExchange(this.rmqConfig.exchange, "topic", {
      durable: true,
      autoDelete: false,
    })

    const body = Buffer.from(JSON.stringify(payload), "utf8")
    channel.publish(this.rmqConfig.exchange, routingKey, body, {
      contentType: "application/json",
      persistent: true,
    })

    this.logger.log(`Published event "${routingKey}" to exchange "${this.rmqConfig.exchange}"`)
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close()
    } catch {
      // Ignore close errors during shutdown
    }
    try {
      await this.connection?.close()
    } catch {
      // Ignore close errors during shutdown
    }
    this.channel = null
    this.connection = null
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel
    }

    const user = encodeURIComponent(this.rmqConfig.user)
    const password = encodeURIComponent(this.rmqConfig.password)
    const vhost = encodeURIComponent(this.rmqConfig.vhost)
    const url = `amqp://${user}:${password}@${this.rmqConfig.host}:${this.rmqConfig.port}/${vhost}`

    const connection = await connect(url, { timeout: 3000 })
    connection.on("close", () => {
      this.connection = null
      this.channel = null
    })
    connection.on("error", () => {
      this.connection = null
      this.channel = null
    })

    const channel = await connection.createChannel()
    channel.on("close", () => {
      this.channel = null
    })

    this.connection = connection
    this.channel = channel
    return channel
  }
}
