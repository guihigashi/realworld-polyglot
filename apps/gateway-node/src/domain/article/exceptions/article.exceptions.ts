export class ArticleNotFoundException extends Error {
  constructor() {
    super("Article not found")
    this.name = "ArticleNotFoundException"
  }
}

export class CommentNotFoundException extends Error {
  constructor() {
    super("Comment not found")
    this.name = "CommentNotFoundException"
  }
}

export class ForbiddenException extends Error {
  constructor(readonly entity: "article" | "comment") {
    super(`${entity} forbidden`)
    this.name = "ForbiddenException"
  }
}
