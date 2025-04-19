import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { base64Content, fileName } = data;

    if (!base64Content || !fileName) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Call ConvertAPI
    const response = await axios.post(
      "https://v2.convertapi.com/convert/pdf/to/xlsx",
      {
        Parameters: [
          {
            Name: "File",
            FileValue: {
              Name: fileName,
              Data: base64Content
            }
          },
          {
            Name: "StoreFile",
            Value: true
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.CONVERT_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Check if conversion was successful
    if (response.data && response.data.Files && response.data.Files.length > 0) {
      return NextResponse.json({
        success: true,
        fileUrl: response.data.Files[0].Url
      });
    } else {
      return NextResponse.json(
        { error: "Conversion failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error converting PDF:", error);
    return NextResponse.json(
      { error: "An error occurred during conversion" },
      { status: 500 }
    );
  }
} 