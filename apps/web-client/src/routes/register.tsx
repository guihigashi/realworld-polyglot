import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerRequestSchema } from "../types/schemas"
import { api } from "../state/api.ts"

export const Route = createFileRoute("/register")({
  component: Register,
})

function Register() {
  const { register, handleSubmit } = useForm<RegisterRequest["user"]>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(registerRequestSchema.shape.user),
  })

  const [registerMutation, result] = api.useRegisterMutation()

  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Sign up</h1>
            <p className="text-xs-center">
              <Link to="/login">Have an account?</Link>
            </p>

            <ul className="error-messages">
              <li>That email is already taken</li>
            </ul>

            <form
              onSubmit={handleSubmit(async (data) => {
                try {
                  const user = await registerMutation({
                    user: data,
                  }).unwrap()

                  console.log(user)
                  await navigate({ to: "/" })
                } catch (e) {
                  console.error(e)
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
                  placeholder="Password"
                  {...register("password")}
                />
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
