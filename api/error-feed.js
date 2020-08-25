const { createFeed } = require("../src/util");
module.exports = createFeed({
  title: "Test Error Feed",
  items: () => {
    throw new TypeError("Unacceptable Request");
  },
});
