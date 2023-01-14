# dedent: removes indentation of template string literal

... and nothing extra!

```javascript
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

## Features

- Removes indentation of a template literal.
- Removes the first empty line, if any.
- Has consistent behavior for escapes and substitutions.
- Supports transforming tagged template literals too.
- Supports TypeScript.
- Supports Node.js ES Modules.
- Has opt-in static transformation via Babel and SWC (to be implemented).

## Tips

### Wrapping tagged template literals

`dedent` can wrap the existing tags, like `String.raw`.

```javascript
const text = dedent(String.raw)`
  Raw string literal \0\1\2\3\4\5\6\7\8\9
`;
```

### Indentation within the text

Indentation is inferred to be the minimum number of spaces or tabs.

Thus you can easily write indentation within the indented text.

```javascript
const text = dedent`
  text
    indented text
`;
```

### Explicit indentation

Escapes and substitutions are not counted as an indentation. You can use it to clarify where to indent:

```javascript
const text = dedent`
  \x20 all lines
    in this text
    are indented
    at 2
`;

const text = dedent`
  ${""}  all lines
    in this text
    are indented
    at 2
`;
```

And that is why this library is designed **not** to support `dedent("...")`. We want it to be consistently aware of escapes and substitutions.

Note that, indentation within substitutions are not counted when inferring the minimal indentation,
obviously because we do not have such information.

```javascript
// Inferred indentation = 2
const text = dedent`
  foo${
""
  }
  bar
`
```

### Empty lines

If the line is empty or contains only spaces and tabs, these lines may have shorter indentation.

```javascript
const text = dedent`
  text

  the line above is empty,
  but the indentation is
  still inferred to be 2.
`;
```

### First line

The first line is treated differently:

- The first line may have different indentation.
- The first line will be removed if it is empty or contains only spaces and tabs.

Therefore you can use both styles:

```javascript
// Using the first line
const text = dedent`  foo
                      bar
                      baz
                      `;
// Skipping the first line
const text = dedent`
  foo
  bar
  baz
`;
```

If you want to produce a text starting with an empty line, you must use the latter form:

```javascript
const text = dedent`

  This text starts
  with an empty line
  but not two.
`;
```

### Last line

Remove the newline character at the end by keeping the backtick in line:

```javascript
// With the newline character at the end
// Equivalent to "foo\nbar\n"
const text = dedent`
  foo
  bar
`;

// Without the newline character at the end
// Equivalent to "foo\nbar"
const text = dedent`
  foo
  bar`;
```

In case you need the newline chracter at the end, you do not need to to keep the backtick at the first column.
Indentation in the last line will be consistently removed.

```javascript
{
  // This text ends with the newline character
  const text = dedent`
    foo
    bar
  `;
}
```

## Installation

To be released
