import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";

const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`Server is ready on port ${PORT}`);
});
