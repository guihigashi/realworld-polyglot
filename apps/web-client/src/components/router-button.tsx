import { createLink } from "@tanstack/react-router"
import type { ComponentProps } from "react"

const RouterButton = createLink((props: ComponentProps<"button">) => <button {...props} />)

export default RouterButton
