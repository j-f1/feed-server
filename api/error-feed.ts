import { createFeed } from "../src/util";

export default createFeed({
  title: "Test Error Feed",
  items: () => {
    throw new TypeError("Unacceptable Request");
  },
});
