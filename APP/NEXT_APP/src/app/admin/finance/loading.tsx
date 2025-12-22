// Finance has its own loading state in FinanceDashboard component
// This prevents the admin loading.tsx from showing DashboardPageSkeleton
export default function Loading() {
    // Empty div - FinanceDashboard handles its own skeleton with proper structure
    return <div />;
}
