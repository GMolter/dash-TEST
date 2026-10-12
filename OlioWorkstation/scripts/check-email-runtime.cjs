// Exercise the real Node loader: transpiled tests can hide CJS/ESM incompatibility.
const assert = require('node:assert/strict');
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Build and deploy with Node.js 24.x.');
const sanitizeHtml = require('sanitize-html');
assert.equal(sanitizeHtml('<p>Hello<script>alert(1)</script></p>'), '<p>Hello</p>');
console.log('Email runtime dependency check passed.');
