// Exercise the real Node loader: transpiled tests can hide CJS/ESM incompatibility.
const assert = require('node:assert/strict');
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Build and deploy with Node.js 24.x.');
const sanitizeHtml = require('../api/_utils/emailSanitizer.generated.cjs');
assert.equal(sanitizeHtml('<p>Hello<script>alert(1)</script></p>'), '<p>Hello</p>');
assert.equal(sanitizeHtml('<a href="javascript:alert(1)">test</a>'), '<a>test</a>');
console.log('Email runtime dependency check passed.');
