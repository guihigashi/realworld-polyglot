import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginRequestSchema } from "../types/schemas.ts"
import { api } from "../state/api.ts"

export const Route = createFileRoute("/login")({
  component: Login,
})

function Login() {
  const { register, handleSubmit } = useForm<LoginRequest["user"]>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginRequestSchema.shape.user),
  })

  const [loginMutation, results] = api.useLoginMutation()

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Sign in</h1>
            <p className="text-xs-center">
              <Link to="/register">Need an account?</Link>
            </p>

            <ul className="error-messages">
              <li>That email is already taken</li>
            </ul>

            <form
              onSubmit={handleSubmit(async (data) => {
                try {
                  const user = await loginMutation({ user: data }).unwrap()
                } catch (e) {
                  console.error(e)
                }
              })}
            >
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
                Sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
