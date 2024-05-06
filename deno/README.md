# `@qnighy/dedent`: JS multi-line literal done right

```javascript
import { dedent } from "@qnighy/dedent";

const mdDoc = dedent`\
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

The `dedent` function does only one thing: it removes indentation **as it
appears in the source code** in a template literal.

Therefore the result is easily predictable. Additionally, you can express **any
text** using the dedent function.

```javascript
import { dedent } from "@qnighy/dedent";

// End-of-line at the end
const eol = dedent`\
  foo
  bar
`;
// No end-of-line at the end
const noEol = dedent`\
  foo
  bar`;

// With all lines indented
const withIndent = dedent`\
  \
    This line is the 1st line. It has 2 spaces of indentation.
    This line is the 2nd line. It has 2 spaces of indentation.
`;
```

## Tagged literal

Tagged literals are also supported. You can write

```javascript
import { dedent } from "@qnighy/dedent";

const text = dedent(myTag)`\
  foo
  ${bar}
`;
```

for

```javascript
const text = myTag`\
foo
${bar}
`;
```

which is often equivalent to:

```javascript
const text = myTag`foo
${bar}
`;
```

## With or without code transformation

You **do not** need to configure Babel or SWC or whatever to use
`@qnighy/dedent`. Simply import the function and you are ready to use it.

Though you can use `@qnighy/babel-plugin-dedent` or `@qnighy/swc-plugin-dedent`
if you need optimization.

## Installation

(NOTE: not released yet)

```
yarn add -D @qnighy/dedent
# OR:
npm install -D @qnighy/dedent
```

## Detailed rules

### Indenting some lines in the indented text

Indentation is determined based on **the longest common indentation** among
lines. Therefore, you can have some lines indented among other lines.

```javascript
const text = dedent`\
  non-indented line
    indented line
`;
```

### The first line

It does not remove indentation of the first line, as it is always preceded by a
backtick <code>`</code>. Remember that the library removes indentation **as it
appears in the source code**.

```javascript
const text = dedent`  indented line
  non-indented line
`;
```

That is why we recommend putting a backslash `\` immediately after the backtick
<code>`</code>, like this:

```javascript
const text = dedent`\
  the above backslash (\\)
  tells JS to join the lines.
`;
```

### Counting

Spaces and tabs are counted equally. The result would be unpredictable should
you mix spaces and tabs.

### Lines containing only spaces and tabs

Lines containing only spaces and tabs are considered to have infinity number of
indentation.

If they are shorter than the inferred indentation, they become empty. Otherwise,
there remain some spaces or tabs.

```javascript
const text = dedent`\
  1st line

  3rd line. The above line is empty.
`;
```

The closing backtick <code>`</code> is not accounted for in this rule.
Therefore, in the example above, last line is considered to be empty.

### Escapes and interpolations

This library removes indentation **as it appears in the source code**.
Therefore, escapes and interpolations are both considered to be non-space
elements.

```javascript
const text = dedent`\
  \x20 <- This is a non-space element
  ${" "} <- This is a non-space element too
`;
```

However, indentation within interpolated expressions are excluded from this
rule, as we cannot reliably know the indentation there.

```javascript
// prettier-ignore
const text = dedent`\
  ${"Indentation is still removed"}
`;
```

This is the only exception to the aforementioned rule.

### Newline characters

There are three types of newline in JS:

- LF (`\n`)
- LS (`\u2028`)
- PS (`\u2029`)

They all start new lines. Note that CR (`\r`) and CRLF (`\r\n`) in the source
text are automatically converted to LF (`\n`) before parsing, thus the library
cannot distinguish between LF, CR, and CRLF.

## License

MIT
