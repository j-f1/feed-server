const { createFeed } = require("../src/util");
module.exports = createFeed({ title: "Test Error Feed" }, () => {
  throw new TypeError("Unacceptable Request");
});
