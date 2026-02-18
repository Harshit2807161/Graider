import Sidebar from "@/components/common/Sidebar";
import { OrgProvider } from "@/context/OrgContext";
import { BatchProvider } from "@/context/BatchContext";
import styles from "./layout.module.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OrgProvider>
            <BatchProvider>
                <div className={styles.container}>
                    <Sidebar />
                    <main className={styles.main}>
                        <div className={styles.content}>
                            {children}
                        </div>
                    </main>
                </div>
            </BatchProvider>
        </OrgProvider>
    );
}
