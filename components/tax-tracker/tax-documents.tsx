import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload } from "lucide-react"

export function TaxDocuments() {
  const documents = [
    {
      id: "doc1",
      name: "US W-2 Form (2024)",
      date: "Feb 15, 2025",
      country: "United States",
      type: "Income",
      size: "245 KB",
    },
    {
      id: "doc2",
      name: "Portugal Rental Receipt",
      date: "Mar 5, 2025",
      country: "Portugal",
      type: "Housing",
      size: "120 KB",
    },
    {
      id: "doc3",
      name: "Thailand Work Permit",
      date: "Jan 10, 2025",
      country: "Thailand",
      type: "Legal",
      size: "1.2 MB",
    },
    {
      id: "doc4",
      name: "Bank Statement (Q1 2025)",
      date: "Apr 5, 2025",
      country: "Global",
      type: "Financial",
      size: "3.4 MB",
    },
  ]

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tax Documents</CardTitle>
          <CardDescription>Store and organize your tax-related documents</CardDescription>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="us">US</TabsTrigger>
            <TabsTrigger value="portugal">Portugal</TabsTrigger>
            <TabsTrigger value="thailand">Thailand</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="pt-4">
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-2">Document</div>
                <div>Country</div>
                <div>Type</div>
                <div>Date</div>
              </div>
              {documents.map((doc) => (
                <div key={doc.id} className="grid grid-cols-5 items-center border-t p-4 text-sm">
                  <div className="col-span-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <div>{doc.country}</div>
                  <div>{doc.type}</div>
                  <div>{doc.date}</div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="us" className="pt-4">
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-2">Document</div>
                <div>Country</div>
                <div>Type</div>
                <div>Date</div>
              </div>
              {documents
                .filter((doc) => doc.country === "United States")
                .map((doc) => (
                  <div key={doc.id} className="grid grid-cols-5 items-center border-t p-4 text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <div>{doc.country}</div>
                    <div>{doc.type}</div>
                    <div>{doc.date}</div>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="portugal" className="pt-4">
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-2">Document</div>
                <div>Country</div>
                <div>Type</div>
                <div>Date</div>
              </div>
              {documents
                .filter((doc) => doc.country === "Portugal")
                .map((doc) => (
                  <div key={doc.id} className="grid grid-cols-5 items-center border-t p-4 text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <div>{doc.country}</div>
                    <div>{doc.type}</div>
                    <div>{doc.date}</div>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="thailand" className="pt-4">
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-2">Document</div>
                <div>Country</div>
                <div>Type</div>
                <div>Date</div>
              </div>
              {documents
                .filter((doc) => doc.country === "Thailand")
                .map((doc) => (
                  <div key={doc.id} className="grid grid-cols-5 items-center border-t p-4 text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <div>{doc.country}</div>
                    <div>{doc.type}</div>
                    <div>{doc.date}</div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
