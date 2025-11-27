const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/analyze", async (req, res) => {
  const { base64Image } = req.body;

  if (!base64Image) {
    console.error("Clarifai API Error:", error.response?.data || error.message);
    return res.status(400).json({ error: "No image provided" });
  }

  console.log("Base64 length:", base64Image.length);
  
  try {
    // النماذج: General + Food & Drink
    const models = [
      "aaa03c23b3724a16a56b629203edc62c", // General
      "bd367be194cf45149e75f01d59f77ba7" // Food & Drink
    ];

    // إرسال الصورة لكلا النموذجين
    const axiosRequests = models.map(modelId =>
      axios.post(
        `https://api.clarifai.com/v2/models/${modelId}/outputs`,
        { inputs: [{ data: { image: { base64: base64Image } } }] },
        {
          headers: {
            "Authorization": "Key 0721a7fea7d943248c7652a1ad31414d",
            "Content-Type": "application/json"
          },
        }

      )
    );

    const clarifaiResponses = await Promise.all(axiosRequests);

    // دمج كل concepts من كلا النموذجين
    let combinedConcepts = [];
    clarifaiResponses.forEach(resp => {
      const concepts = resp.data.outputs[0]?.data?.concepts;
      if (concepts) combinedConcepts = combinedConcepts.concat(concepts);
    });

    res.json({ outputs: [{ data: { concepts: combinedConcepts } }] });
  } catch (error) {
  console.error("Clarifai API Error:", error.response?.data || error.message);
  return res.status(500).json({
    error: "Clarifai request failed",
    details: error.response?.data
  });
}

});

module.exports = router;
