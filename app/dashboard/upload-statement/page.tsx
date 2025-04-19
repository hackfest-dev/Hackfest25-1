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

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Content = e.target?.result?.toString().split(',')[1];
          
          const response = await axios.post('/api/convert-pdf', {
            base64Content,
            fileName: file.name
          });

          if (response.data.success) {
            setConvertedFileUrl(response.data.fileUrl);
            setConversionStatus('success');
            toast({
              title: "Conversion successful",
              description: "Your PDF has been converted to XLSX format.",
            });
          } else {
            throw new Error(response.data.error || 'Conversion failed');
          }
        } catch (error) {
          console.error('Error during conversion:', error);
          setError('Failed to convert the file. Please try again.');
          setConversionStatus('error');
          toast({
            variant: "destructive",
            title: "Conversion failed",
            description: "There was an error converting your PDF. Please try again.",
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Error reading the file. Please try again.');
        setConversionStatus('error');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error during upload:', error);
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