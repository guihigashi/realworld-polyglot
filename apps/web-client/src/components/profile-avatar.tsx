import type { ImgHTMLAttributes } from "react"

type ProfileAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  profile: Pick<Profile, "username" | "image">
}

export default function ProfileAvatar({ profile, ...props }: ProfileAvatarProps) {
  return <img src={profile.image ?? "/default-avatar.svg"} alt={`${profile.username}'s avatar`} {...props} />
}
