import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { useAppDispatch, useAppSelector } from "../state/hooks.ts"
import { type AuthState, logout } from "../state/authSlice.ts"
import { useForm } from "react-hook-form"
import { api } from "../state/api.ts"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateUserRequestSchema } from "../types/schemas.ts"
import { z } from "zod"
import { handleFormError } from "../utils/helpers.ts"

export const Route = createFileRoute("/settings")({
  component: Settings,
  beforeLoad: ({ context }) => {
    if (context.auth.status !== "authenticated") {
      throw redirect({ to: "/" })
    }
  },
})

const updateUserFormSchema = updateUserRequestSchema.required().extend({
  password: updateUserRequestSchema.shape.password.unwrap().or(z.literal("")),
})

type UpdateUserForm = z.infer<typeof updateUserFormSchema>

function defaultValuesFromAuth(auth: AuthState): UpdateUserForm {
  if (auth.status === "authenticated") {
    return {
      image: auth.user.image ?? "",
      username: auth.user.username,
      bio: auth.user.bio ?? "",
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
  const navigate = useNavigate({ from: Route.to })

  const {
    register,
    handleSubmit,
    formState: { touchedFields, errors },
    setError,
    clearErrors,
  } = useForm<UpdateUserForm>({
    defaultValues: defaultValuesFromAuth(auth),
    resolver: zodResolver(updateUserFormSchema),
  })

  const [updateUserMutation] = api.useUpdateUserMutation()

  return (
    <div className="settings-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Your Settings</h1>

            {errors.root && (
              <ul className="error-messages">
                <li>{errors.root.message}</li>
              </ul>
            )}

            <form
              onSubmit={handleSubmit(async (data) => {
                const payload: UpdateUserRequest = {}

                for (const k of Object.keys(touchedFields)) {
                  const key = k as keyof UpdateUserForm
                  if (touchedFields[key]) {
                    if (key !== "password" || data[key] !== "") {
                      payload[key] = data[key]
                    }
                  }
                }

                clearErrors()
                try {
                  const { user } = await updateUserMutation({ user: payload }).unwrap()

                  await navigate({
                    to: "/profile/$username",
                    params: {
                      username: user.username,
                    },
                  })
                } catch (e) {
                  handleFormError(e, setError, (s) => s.replace(/^user\./, ""))
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
                  {errors.image && <span className="form-field-error-message">{errors.image.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Your Name"
                    {...register("username")}
                  />
                  {errors.username && <span className="form-field-error-message">{errors.username.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <textarea
                    className="form-control form-control-lg"
                    rows={8}
                    placeholder="Short bio about you"
                    {...register("bio")}
                  />
                  {errors.bio && <span className="form-field-error-message">{errors.bio.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Email"
                    {...register("email")}
                  />
                  {errors.email && <span className="form-field-error-message">{errors.email.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    {...register("password")}
                  />
                  {errors.password && <span className="form-field-error-message">{errors.password.message}</span>}
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
