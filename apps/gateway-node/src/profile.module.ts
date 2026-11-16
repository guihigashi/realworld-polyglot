import { Module } from "@nestjs/common"
import { AuthModule } from "@/auth.module.js"
import { FollowUserUseCase } from "@/application/profile/use-cases/follow-user.use-case.js"
import { GetProfileUseCase } from "@/application/profile/use-cases/get-profile.use-case.js"
import { UnfollowUserUseCase } from "@/application/profile/use-cases/unfollow-user.use-case.js"
import { SocialGraphModule } from "@/infrastructure/profile/social-graph.module.js"
import { ProfileController } from "@/presentation/http/controllers/profile.controller.js"

@Module({
  imports: [AuthModule, SocialGraphModule],
  controllers: [ProfileController],
  providers: [GetProfileUseCase, FollowUserUseCase, UnfollowUserUseCase],
})
export class ProfileModule {}
