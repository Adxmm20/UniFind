// The vocabulary the /post form (client) and its server action both need.
//
// It lives on its own rather than in lib/posts.ts because that module touches
// the filesystem — importing it from a Client Component would be a build error,
// while these two values are exactly what the two sides have to agree on.
// `PostType` also names the three kinds everywhere else the feature talks about
// itself, so lib/posts.ts builds its drafts from it too.

export type PostType = "event" | "rent" | "service";

// The category select's sentinel for "my category isn't in your list": the
// action reads the sibling `categoryOther` field when it sees this value.
export const CATEGORY_OTHER = "__other__";
