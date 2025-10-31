import mongoose from "mongoose";
import User from "./models/User.js";

const MONGO_URI = "mongodb+srv://akeroland63:Abate201925@cluster0.vtuqoef.mongodb.net/ibtp?retryWrites=true&w=majority&appName=Cluster0";

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB !");
  } catch (err) {
    console.error("💥 Erreur de connexion MongoDB :", err);
    process.exit(1);
  }
}

async function generateUniquePhone(counter) {
  let phone;
  let exists = true;
  while (exists) {
    phone = `+2250101010${counter.toString().padStart(2, "0")}`;
    exists = await User.exists({ phone });
    if (exists) counter++;
  }
  return phone;
}

async function updatePhones() {
  try {
    const users = await User.find({ phone: { $exists: false } });
    console.log(`🔹 Utilisateurs trouvés: ${users.length}`);

    let counter = 1;
    for (const user of users) {
      const newPhone = await generateUniquePhone(counter);
      await User.updateOne({ _id: user._id }, { phone: newPhone });
      console.log(`✅ ${user.email} -> nouveau phone: ${newPhone}`);
      counter++;
    }
  } catch (err) {
    console.error("💥 Erreur lors de la mise à jour :", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔹 Déconnecté de MongoDB");
  }
}

(async () => {
  await connectMongo();
  await updatePhones();
})();
