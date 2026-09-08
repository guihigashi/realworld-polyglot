import type { ImgHTMLAttributes } from "react"

const defaultAvatarUrl = "/default-avatar.svg"

type ProfileAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  profile: Pick<Profile, "username" | "image">
}

export default function ProfileAvatar({ profile, alt, ...props }: ProfileAvatarProps) {
  const src = profile.image?.trim() || defaultAvatarUrl

  return (
    <img
      src={src}
      alt={alt ?? `${profile.username}'s avatar`}
      {...props}
      onError={(e) => {
        props.onError?.(e)
        if (!e.currentTarget.src.endsWith(defaultAvatarUrl)) {
          e.currentTarget.src = defaultAvatarUrl
        }
      }}
    />
  )
}
