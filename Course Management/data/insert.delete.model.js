const connectDB = require("../config/db");

const insertModel = async (modelName, filePath) => {
  try {
    const Model = require(`../models/${modelName}.model`);
    const modelData = require(filePath);
    await connectDB();

    for (const model of modelData) {
      try {
        await Model.create(model);
        console.log(`Inserted ${modelName}: ${model.name}`);
      } catch (err) {
        console.error(`Failed to insert "${model.name}": ${err.message}`);
      }
    }
  } catch (error) {
    console.error(`Failed to insert ${modelName}:`, error.message);
    process.exit(1);
  }
};

const deleteModel = async (modelName) => {
  try {
    const Model = require(`../models/${modelName}.model`);
    await connectDB();
    await Model.deleteMany();
    console.log(`All ${modelName} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete ${modelName}:`, error.message);
    process.exit(1);
  }
};

const upsertModel = async (modelName, filePath) => {
  try {
    const Model = require(`../models/${modelName}.model`);
    const modelData = require(filePath);
    await connectDB();

    for (const model of modelData) {
      try {
        await Model.findOneAndUpdate(
          { name: model.name },
          model,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`Upserted ${modelName}: ${model.name}`);
      } catch (err) {
        console.error(`Failed to upsert "${model.name}": ${err.message}`);
      }
    }
  } catch (error) {
    console.error(`Failed to upsert ${modelName}:`, error.message);
    process.exit(1);
  }
};

const command = process.argv[2];
const modelName = process.argv[3] || "course";
const filePath = process.argv[4] || "./courses.json";

(async () => {
  switch (command) {
    case "--insert":
      await insertModel(modelName, filePath);
      break;
    case "--delete":
      await deleteModel(modelName);
      break;
    case "--upsert":
      await upsertModel(modelName, filePath);
      break;
    default:
      console.log(`
❓ Unknown command.

Usage:
  --insert <modelName> <filePath>
  --delete <modelName>
  --upsert <modelName> <filePath>

Example:
  node manageModels.js --insert course ./courses.json
`);
      process.exit(1);
  }
  process.exit(0);
})();
