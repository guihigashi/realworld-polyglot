import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerRequestSchema } from "../types/schemas"
import { api } from "../state/api.ts"
import { handleFormError } from "../utils/helpers.ts"

export const Route = createFileRoute("/register")({
  component: Register,
})

function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors
  } = useForm<RegisterRequest>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(registerRequestSchema),
  })

  const [registerMutation] = api.useRegisterMutation()

  const navigate = useNavigate({ from: Route.to })

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Sign up</h1>
            <p className="text-xs-center">
              <Link to="/login">Have an account?</Link>
            </p>

            {errors.root && (
              <ul className="error-messages">
                <li>{errors.root.message}</li>
              </ul>
            )}

            <form
              onSubmit={handleSubmit(async (data) => {
              clearErrors()
                try {
                  await registerMutation({ user: data }).unwrap()

                  await navigate({ to: "/" })
                } catch (e) {
                  handleFormError(e, setError)
                }
              })}
            >
              <fieldset className="form-group">
                <input
                  className="form-control form-control-lg"
                  type="text"
                  placeholder="Username"
                  {...register("username")}
                />
                {errors.username && <span className="form-field-error-message">{errors.username.message}</span>}
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
                  placeholder="Password"
                  {...register("password")}
                />
                {errors.password && <span className="form-field-error-message">{errors.password.message}</span>}
              </fieldset>
              <button type="submit" className="btn btn-lg btn-primary pull-xs-right">
                Sign up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
