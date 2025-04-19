import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();
    console.log('Processing file:', fileUrl);

    // Download the XLSX file
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });

    // Read the workbook
    const workbook = XLSX.read(response.data, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert worksheet to JSON with header: 1 to get raw rows
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('First few rows:', jsonData.slice(0, 3));

    // Process each row
    const transactions = jsonData
      .filter((row: any[]) => row.length >= 1) // At least one column
      .map((row: any[]) => {
        // Extract and clean date from first column
        let formattedDate = '';
        let description = '';
        const dateCell = row[0];

        if (typeof dateCell === 'string') {
          // Handle date in DD-MM-YYYY format at start of string
          const dateMatch = dateCell.match(/(\d{2})-(\d{2})-(\d{4})/);
          if (dateMatch) {
            const [_, day, month, year] = dateMatch;
            formattedDate = `${year}-${month}-${day}`;
            // Extract description from the same cell if it exists
            description = dateCell.split(/\s+/).slice(1).join(' ');
          }
        } else if (typeof dateCell === 'number') {
          // Handle Excel date number format
          const excelDate = new Date(Math.round((dateCell - 25569) * 86400 * 1000));
          formattedDate = excelDate.toISOString().split('T')[0];
        }

        // If description wasn't in date cell, check second column
        if (!description && row[1]) {
          description = row[1].toString().trim();
        }

        // Clean up description - remove extra whitespace and newlines
        description = description.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract amount and determine if it's credit or debit
        let amount = 0;
        let type = '';
        
        // Check debit first (column 4) - money going out
        if (row[3] && !isNaN(parseFloat(row[3]))) {
          amount = -Math.abs(parseFloat(row[3])); // Make sure it's negative
          type = 'expense';
        }
        // Then check credit (column 3) - money coming in
        else if (row[2] && !isNaN(parseFloat(row[2]))) {
          amount = Math.abs(parseFloat(row[2])); // Make sure it's positive
          type = 'income';
        }

        // Only return if we have a valid transaction
        if (!amount || !type) {
          return null;
        }

        return {
          date: formattedDate,
          description,
          amount,
          type,
          isVerified: false,
          category: type === 'income' ? 'Income' : 'Other'
        };
      })
      // Filter out null and invalid transactions
      .filter(t => {
        return (
          t && // Remove null transactions
          t.date && // Has valid date
          t.description && // Has description
          t.amount !== 0 && // Has non-zero amount
          t.type // Has transaction type
        );
      });

    console.log('Extracted transactions:', transactions.length);
    if (transactions.length > 0) {
      console.log('Sample transaction:', transactions[0]);
    }

    return NextResponse.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error extracting statement data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract data from statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 