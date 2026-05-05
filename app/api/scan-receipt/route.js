import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("API Key present:", !!process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Check file size
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size should be less than 5MB" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to Base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )

      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a receipt, return an empty object
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("Gemini response text:", text); // Debug log
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText);
      if (!data.amount) {
        return NextResponse.json({ error: "No receipt data found in the image" }, { status: 400 });
      }
      return NextResponse.json({
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: data.category,
        merchantName: data.merchantName,
      });
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      return NextResponse.json({ error: "Invalid response format from Gemini: " + parseError.message }, { status: 500 });
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    // Fallback: return mock data for testing
    return NextResponse.json({
      amount: 0,
      date: new Date().toISOString(),
      description: "Mock data - AI scan failed",
      category: "other-expense",
      merchantName: "Unknown",
    });
  }
}