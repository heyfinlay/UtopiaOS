export const config = {
  runtime: "nodejs",
};

let appPromise;

const getApp = () => {
  appPromise ??= import("../apps/api/dist/app.js")
    .then(({ createApp }) => createApp())
    .catch((error) => {
      appPromise = undefined;
      throw error;
    });

  return appPromise;
};

export default async function handler(request) {
  const app = await getApp();

  return app.fetch(request);
}
