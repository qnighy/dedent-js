# `@qnighy/dedent`: JS multi-line literal done right

```javascript
import { dedent } from "@qnighy/dedent";

const mdDoc = dedent`
  ## Hello!

  - Plants
    - Apples
    - Oranges
  - Animals
    - Dogs
    - Cats
`;
```

## Simple, yet expressive

The `dedent` function does only two things:

1. removes indentation from the template literal.
2. removes the first line, if it is empty or contains only spaces or tabs.

Therefore the result is easily predictable. Additionally, you can express **any text** using the dedent function.

```javascript
import { dedent } from "@qnighy/dedent";

// End-of-line at the end
const eol = dedent`
  foo
  bar
`;
// No end-of-line at the end
const noEol = dedent`
  foo
  bar`;

// With all lines indented
const withIndent = dedent`
  ${""}  This line is indented with two spaces.
    This line is also indented.
`;
```

## Tagged literal

Tagged literal is also supported. You can write

```javascript
import { dedent } from "@qnighy/dedent";

const text = dedent(myTag)`
  foo
  ${bar}
`;
```

for

```javascript
const text = myTag`foo
${bar}
`;
```

## With or without code transformation

You **do not** need to configure Babel or SWC or whatever to use `@qnighy/dedent`. Simply import the function and you are ready to use it.

Though you can use `@qnighy/babel-plugin-dedent` or `@qnighy/swc-plugin-dedent` if you need optimization.

## Installation

(NOTE: not released yet)

```
yarn add -D @qnighy/dedent
# OR:
npm install -D @qnighy/dedent
```
