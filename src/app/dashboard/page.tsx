import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, LogIn, Activity, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
    const stats = [
        { title: "Total Users", value: "1,257", icon: <Users className="h-6 w-6 text-muted-foreground" /> },
        { title: "Active Now", value: "83", icon: <Activity className="h-6 w-6 text-muted-foreground" /> },
        { title: "Logins (24h)", value: "431", icon: <LogIn className="h-6 w-6 text-muted-foreground" /> },
        { title: "Failed Logins", value: "12", icon: <ShieldAlert className="h-6 w-6 text-muted-foreground" /> },
    ];
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-muted-foreground">Here's a quick overview of your application's stats.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                +20.1% from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Activity feed will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
