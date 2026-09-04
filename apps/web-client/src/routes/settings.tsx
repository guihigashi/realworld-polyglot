import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { useAppDispatch, useAppSelector } from "../state/hooks.ts"
import { type AuthState, logout } from "../state/authSlice.ts"
import { useForm } from "react-hook-form"
import { api } from "../state/api.ts"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateUserRequestSchema } from "../types/schemas.ts"

export const Route = createFileRoute("/settings")({
  component: Settings,
  beforeLoad: ({ context }) => {
    if (context.auth.status !== "authenticated") {
      throw redirect({ to: "/" })
    }
  },
})

function defaultValuesFromAuth(auth: AuthState): UpdateUserRequestIn {
  if (auth.status === "authenticated") {
    return {
      image: auth.user.image,
      username: auth.user.username,
      bio: auth.user.bio,
      email: auth.user.email,
      password: "",
    }
  }

  throw new Error("User is not authenticated")
}

function Settings() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)
  const router = useRouter()
  const navigate = useNavigate()

  const { register, handleSubmit } = useForm<UpdateUserRequestIn, any, UpdateUserRequestOut>({
    defaultValues: defaultValuesFromAuth(auth),
    resolver: zodResolver(updateUserRequestSchema),
  })

  const [updateUserMutation] = api.useUpdateUserMutation()

  return (
    <div className="settings-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Your Settings</h1>

            <ul className="error-messages">
              <li>That name is required</li>
            </ul>

            <form
              onSubmit={handleSubmit(async (data) => {
                try {
                  const { user } = await updateUserMutation({ user: data }).unwrap()

                  await navigate({
                    to: "/profile/$username",
                    params: {
                      username: user.username,
                    },
                  })
                } catch (e) {
                  console.error(e)
                }
              })}
            >
              <fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="URL of profile picture"
                    {...register("image")}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Your Name"
                    {...register("username")}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <textarea
                    className="form-control form-control-lg"
                    rows={8}
                    placeholder="Short bio about you"
                    {...register("bio")}
                  ></textarea>
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Email"
                    {...register("email")}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    {...register("password")}
                  />
                </fieldset>
                <button type="submit" className="btn btn-lg btn-primary pull-xs-right">
                  Update Settings
                </button>
              </fieldset>
            </form>
            <hr />
            <button
              className="btn btn-outline-danger"
              onClick={async () => {
                dispatch(logout())
                await router.invalidate()
              }}
            >
              Or click here to logout.
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
