"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllCategories } from "@/lib/transactionCategories";

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  isVerified: boolean;
  category: string;
}

export default function UploadStatementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [convertedFileUrl, setConvertedFileUrl] = useState<string | null>(null);
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const categories = getAllCategories();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if file is a PDF
      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
      setConversionStatus("idle");
      setConvertedFileUrl(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check if file is a PDF
      if (droppedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setError(null);
      setConversionStatus("idle");
      setConvertedFileUrl(null);
    }
  };
  
  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);
    setConversionStatus('converting');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('Starting PDF conversion...');
          const base64Content = e.target?.result?.toString().split(',')[1];
          
          const response = await axios.post('/api/convert-pdf', {
            base64Content,
            fileName: file.name
          });

          console.log('PDF conversion response:', response.data);

          if (response.data.success) {
            setConvertedFileUrl(response.data.fileUrl);
            setConversionStatus('success');
            
            console.log('Starting data extraction from:', response.data.fileUrl);
            // Extract data from the converted XLSX
            try {
              const extractResponse = await axios.post('/api/extract-statement', {
                fileUrl: response.data.fileUrl
              });

              console.log('Extraction response:', extractResponse.data);
              
              if (extractResponse.data.success && extractResponse.data.transactions) {
                const transactions = extractResponse.data.transactions.map((t: any) => ({
                  ...t,
                  isVerified: false,
                  category: 'other'
                }));
                console.log('Processed transactions:', transactions);
                
                setExtractedTransactions(transactions);
                setShowVerification(true);
                toast({
                  title: "Data extracted successfully",
                  description: `Found ${transactions.length} transactions. Please verify them.`,
                });
              } else {
                throw new Error(extractResponse.data.error || 'No transactions found in the file');
              }
            } catch (extractError) {
              console.error('Data extraction error:', extractError);
              setError('Failed to extract data from the converted file. Please check the file format.');
              toast({
                variant: "destructive",
                title: "Extraction failed",
                description: extractError instanceof Error ? extractError.message : 'Failed to extract data',
              });
            }
          } else {
            throw new Error(response.data.error || 'Conversion failed');
          }
        } catch (error) {
          console.error('Error during conversion/extraction:', error);
          setError('Failed to process the file. Please try again.');
          setConversionStatus('error');
          toast({
            variant: "destructive",
            title: "Processing failed",
            description: error instanceof Error ? error.message : 'An error occurred',
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setError('Error reading the file. Please try again.');
        setConversionStatus('error');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setError('An error occurred during the upload. Please try again.');
      setConversionStatus('error');
      setIsUploading(false);
    }
  };
  
  const handleDownload = () => {
    if (convertedFileUrl) {
      window.open(convertedFileUrl, "_blank");
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setFileName("");
    setUploadProgress(0);
    setError(null);
    setConversionStatus("idle");
    setConvertedFileUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleVerificationChange = (index: number, isVerified: boolean) => {
    setExtractedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, isVerified } : t)
    );
  };

  const handleTransactionEdit = (index: number, field: keyof ExtractedTransaction, value: any) => {
    setExtractedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, [field]: value } : t)
    );
  };

  const handleSaveTransactions = async () => {
    try {
      const verifiedTransactions = extractedTransactions
        .filter(t => t.isVerified)
        .map(t => ({
          userId: user?.uid,
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          currency: 'INR',
          category: t.category,
          location: {
            country: 'India',
            city: 'Unknown'
          }
        }));

      const response = await axios.post('/api/transactions/bulk', {
        transactions: verifiedTransactions
      });

      if (response.data.success) {
        toast({
          title: "Transactions saved successfully",
          description: `${verifiedTransactions.length} transactions have been added to your account.`,
        });
        handleReset();
      }
    } catch (error) {
      console.error('Error saving transactions:', error);
      toast({
        variant: "destructive",
        title: "Error saving transactions",
        description: "Failed to save the transactions. Please try again.",
      });
    }
  };
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Bank Statement</h1>
        <p className="text-muted-foreground mt-2">
          Upload your bank statement PDF to convert it to XLSX format for easier transaction processing.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Convert PDF to XLSX</CardTitle>
          <CardDescription>
            Upload your bank statement PDF and we'll convert it to XLSX format for easier data extraction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
              id="file-upload"
            />
            
            {!file ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-lg font-medium">Drag and drop your PDF here</div>
                <div className="text-sm text-muted-foreground">or</div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  Only PDF files are supported
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <FileText className="h-10 w-10 text-primary" />
                <div className="text-lg font-medium">{fileName}</div>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="mt-2"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
          
          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Converting PDF to XLSX...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          {conversionStatus === "success" && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium text-green-700 dark:text-green-400">Conversion successful!</div>
                <div className="text-sm text-green-600 dark:text-green-500">
                  Your PDF has been converted to XLSX format.
                </div>
              </div>
            </div>
          )}
          
          {conversionStatus === "error" && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="font-medium text-red-700 dark:text-red-400">Conversion failed</div>
                <div className="text-sm text-red-600 dark:text-red-500">
                  There was an error converting your PDF. Please try again.
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isUploading}
          >
            Reset
          </Button>
          
          <div className="flex gap-2">
            {conversionStatus === "success" && (
              <Button 
                onClick={handleDownload}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download XLSX
              </Button>
            )}
            
            <Button 
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Convert to XLSX
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Debug information */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Conversion Status: {conversionStatus}</p>
        <p>Show Verification: {showVerification ? 'true' : 'false'}</p>
        <p>Number of Transactions: {extractedTransactions.length}</p>
      </div>
      
      {showVerification && extractedTransactions.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Verify Extracted Transactions</CardTitle>
            <CardDescription>
              Please verify the extracted transactions before saving them to your account.
              Edit any incorrect values, select categories, and check the verify box for each correct transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Verify</TableHead>
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead className="w-[150px] text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedTransactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={transaction.isVerified}
                          onCheckedChange={(checked) => 
                            handleVerificationChange(index, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={transaction.date}
                          onChange={(e) => 
                            handleTransactionEdit(index, 'date', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={transaction.description}
                          onChange={(e) => 
                            handleTransactionEdit(index, 'description', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaction.category}
                          onValueChange={(value) =>
                            handleTransactionEdit(index, 'category', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={transaction.amount}
                          onChange={(e) => 
                            handleTransactionEdit(index, 'amount', parseFloat(e.target.value))
                          }
                          className="text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerification(false);
                  console.log('Hiding verification table');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTransactions}
                disabled={!extractedTransactions.some(t => t.isVerified)}
              >
                Save Verified Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">Upload PDF</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload your bank statement in PDF format using the form above.
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">Convert to XLSX</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Our system converts your PDF to XLSX format for easier data extraction.
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">Download & Process</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Download the XLSX file and use it to import transactions into your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 