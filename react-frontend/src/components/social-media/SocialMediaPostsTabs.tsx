import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SocialMediaPostsTabsProps {
  children: React.ReactNode;
  filters: React.ReactNode;
}

export const SocialMediaPostsTabs: React.FC<SocialMediaPostsTabsProps> = ({
  children,
  filters
}) => {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <Tabs defaultValue="all" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-col md:flex-row justify-between">
      </div>

      <TabsContent value="all" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            {children}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="published">
        <Card>
          <CardContent className="p-0">
            {children}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="drafts">
        <Card>
          <CardContent className="p-0">
            {children}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="scheduled">
        <Card>
          <CardContent className="p-0">
            {children}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};