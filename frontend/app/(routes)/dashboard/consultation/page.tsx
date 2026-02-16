import DoctorsList from "./_components/DoctorsList";
import HistoryList from "./_components/HistoryList";
import ConsultationHistory from "./_components/ConsultationHistory";

export default function VoiceConsultationPage() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Voice Consultation</h1>
                <p className="text-gray-500 mt-1">
                    Talk to specialized AI doctors for personalized medical advice
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <DoctorsList />
                </div>
                <div>
                    <HistoryList />
                </div>
            </div>

            {/* Previous Consultation Reports Table */}
            <ConsultationHistory />
        </div>
    );
}
