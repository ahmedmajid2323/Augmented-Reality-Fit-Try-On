
self.onmessage = async (event) => {
  const { type } = event.data;

  switch (type) {
    case "init":
      self.postMessage({ type: "ready" });
      break;

    case "process":
      if (event.data.data && event.data.data.bitmap) {
        event.data.data.bitmap.close();
      }
      break;

    case "dispose":
      break;
  }
};
