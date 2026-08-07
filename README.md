# RealWorld Implementation

This repository is a full-stack implementation of the [RealWorld Specification](https://docs.realworld.show/). 

The RealWorld spec defines a standardized API and frontend behavior for a medium-complexity blogging platform (often called "Conduit"), allowing developers to compare how different languages, frameworks, and architectures handle identical product requirements.

## Architecture & Goals

This project was built primarily to showcase my personal skills and architectural approach to modern web application development. 

Rather than defaulting to standard framework conventions, this implementation explores:
* **Clean Architecture / Domain-Driven Design:** Decoupling core business rules from infrastructure and presentation concerns.
* **Strict Typing & Behavior:** Ensuring entities maintain valid states (e.g., proper handling of nulls vs. empty strings) and expose explicit behavioral methods rather than generic setters.
* **Component-Based Structure:** Organizing the codebase by domain features rather than technical layers.

## Current Status

* **Gateway Service:** The API gateway is actively passing the RealWorld API testing suite for authentication (`auth.hurl`), handling registration, login, and strict partial updates securely via JWT.