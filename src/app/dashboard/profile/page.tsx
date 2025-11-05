
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { ProfileDetails } from "@/components/profile-details";
import { useUser } from "@/hooks/use-user";
import { List, ListItem } from "@/components/ui/list";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function UserDeviceList() {
    const { user, isLoading } = useUser();
    const { toast } = useToast();

    const handleCopy = (uid: string) => {
        navigator.clipboard.writeText(uid);
        toast({
            title: 'Copied to clipboard!',
            description: `UID: ${uid}`,
        });
    };

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>My Devices</CardTitle>
                    <CardDescription>A list of all devices registered to your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Devices</CardTitle>
                <CardDescription>A list of all devices registered to your account.</CardDescription>
            </CardHeader>
            <CardContent>
                {user?.devices && user.devices.length > 0 ? (
                    <List>
                        {user.devices.map(uid => (
                            <ListItem key={uid}>
                                <span className="font-mono text-sm flex-1">{uid}</span>
                                <Button size="sm" variant="ghost" onClick={() => handleCopy(uid)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <p className="text-sm text-muted-foreground">You have no devices registered to your account yet.</p>
                )}
            </CardContent>
        </Card>
    )
}


export default function ProfilePage() {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">View and manage your account details.</p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <ProfileDetails />
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Update Information</CardTitle>
                        <CardDescription>Update your personal details here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm />
                    </CardContent>
                </Card>
                <UserDeviceList />
            </div>
        </div>
    </div>
  );
}
