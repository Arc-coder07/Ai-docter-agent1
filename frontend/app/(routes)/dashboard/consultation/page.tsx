import DoctorsList from "./_components/DoctorsList";
import HistoryList from "./_components/HistoryList";
import ConsultationHistory from "./_components/ConsultationHistory";
import AddNewSession from "./_components/AddNewSession";
import Image from "next/image";
import { Mic } from "lucide-react";

export default function VoiceConsultationPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Page Hero Header */}
            <div className="mb-10 w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#6b42f5] via-[#7d48f7] to-[#8c4bf7] p-8 md:p-12 lg:p-14 text-white shadow-xl relative flex flex-col md:flex-row items-center justify-between gap-10">
                {/* Text Content Area */}
                <div className="flex-1 max-w-2xl z-10 flex flex-col items-center text-center md:items-start md:text-left gap-6">
                    <h1 className="text-4xl md:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-tight">
                        Consult with Expert<br className="hidden md:block" /> AI Doctors Anytime
                    </h1>
                    <p className="text-white/90 mt-2 text-base md:text-lg max-w-md leading-relaxed font-normal">
                        Get personalized medical advice through real-time voice consultations with specialized AI health agents.
                    </p>
                    <AddNewSession hideTrigger={true}>
                        <button className="mt-2 flex items-center justify-center gap-2 bg-white text-[#6b42f5] font-semibold px-6 py-4 rounded-xl hover:bg-gray-100 transition-all shadow-md active:scale-95 duration-200">
                            <Mic className="w-5 h-5 text-[#6b42f5]" />
                            Start Instant Consultation
                        </button>
                    </AddNewSession>
                </div>

                {/* Illustration / Image Area */}
                <div className="relative z-10 hidden md:flex w-48 h-48 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-3xl overflow-hidden shadow-2xl bg-black/20 ring-[6px] ring-[#512cc2] flex-shrink-0 items-center justify-center">
                    <Image
                        src="/medical-assistance.png"
                        alt="AI Doctor"
                        fill
                        className="object-cover"
                    />
                </div>
            </div>

            {/* Doctor Selection + History Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <DoctorsList />
                </div>
                <div>
                    <HistoryList />
                </div>
            </div>

            {/* Reports Section */}
            <ConsultationHistory />
        </div>
    );
}
