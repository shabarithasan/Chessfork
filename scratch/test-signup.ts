import { createUserAccount } from "../src/server/repositories/user-repository";

async function test() {
  try {
    const user = await createUserAccount({
      displayName: "Test User",
      email: "test@example.com",
      password: "password123",
      locale: "en",
    });
    console.log("Created user:", user);
  } catch (error) {
    console.error("Failed:", error);
  }
}

test();
