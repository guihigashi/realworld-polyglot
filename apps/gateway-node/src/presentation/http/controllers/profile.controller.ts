import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Res, UseFilters, UseGuards } from "@nestjs/common"
import type { ServerResponse } from "node:http"
import { FollowUserUseCase } from "@/application/profile/use-cases/follow-user.use-case.js"
import { GetProfileUseCase } from "@/application/profile/use-cases/get-profile.use-case.js"
import { UnfollowUserUseCase } from "@/application/profile/use-cases/unfollow-user.use-case.js"
import type { ProfileData } from "@/domain/profile/entities/profile.entity.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import { ProfileExceptionFilter } from "@/presentation/http/filters/profile-exception.filter.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"

@Controller("profiles")
@UseFilters(ProfileExceptionFilter)
export class ProfileController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly followUser: FollowUserUseCase,
    private readonly unfollowUser: UnfollowUserUseCase,
  ) {}

  @Get(":username")
  @UseGuards(OptionalJwtAuthGuard)
  async show(
    @Param("username") username: string,
    @CurrentUserId() requestorId?: string,
  ): Promise<{ profile: ProfileData }> {
    const profile = await this.getProfile.execute(username, requestorId ?? null)
    return { profile: profile.toJSON() }
  }

  @Post(":username/follow")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async follow(
    @CurrentUserId() followerId: string,
    @Param("username") username: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ profile: ProfileData }> {
    const profile = await this.followUser.execute(followerId, username)
    res.setHeader("X-Follows-Version", String(profile.followsVersion))
    return { profile: profile.toJSON() }
  }

  @Delete(":username/follow")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @CurrentUserId() followerId: string,
    @Param("username") username: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ profile: ProfileData }> {
    const profile = await this.unfollowUser.execute(followerId, username)
    res.setHeader("X-Follows-Version", String(profile.followsVersion))
    return { profile: profile.toJSON() }
  }
}
