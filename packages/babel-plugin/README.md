# Babel plugin to optimize `@qnighy/dedent`

## When do I need this?

This library is useful if you are using `@qnighy/dedent` **in a production code**.

You don't need this if you are using `@qnighy/dedent` in a test code or a development-only script.

## Installation

(NOTE: not released yet)

```
yarn add -D @qnighy/babel-plugin-dedent
# OR:
npm install -D @qnighy/babel-plugin-dedent
```

## Configuration

```javascript
// babel.config.js example
export default {
  plugins: [
    // ...
    "@qnighy/dedent",
    // ...
  ],
};
```
