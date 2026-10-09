import React from 'react';
import { useGetPersonalRecognition } from '@/store/server/features/CFR/recognition/queries';
import IssuedReprimand from '@/app/(afterLogin)/(okrplanning)/okr/dashboard/_components/Performance/performanceCard/issuedReprimand';
import ReceivedReprimand from '@/app/(afterLogin)/(okrplanning)/okr/dashboard/_components/Performance/performanceCard/receivedReprimand';
import IssuedAppreciation from '@/app/(afterLogin)/(okrplanning)/okr/dashboard/_components/Performance/performanceCard/issuedAppreciation';
import ReceivedAppreciation from '@/app/(afterLogin)/(okrplanning)/okr/dashboard/_components/Performance/performanceCard/receivedAppreciation';

const Appreciation = () => {
  const { data: getPersonalRecognition } = useGetPersonalRecognition();
  return (
    <div className="p-1">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-1 lg:col-span-6 flex flex-col gap-4">
          <IssuedReprimand
            kpi={getPersonalRecognition?.feedbackIssued?.KPI?.reprimands || 0}
            engagement={
              getPersonalRecognition?.feedbackIssued?.Engagement?.reprimands ||
              0
            }
          />
          <ReceivedReprimand
            kpi={getPersonalRecognition?.feedbackReceived?.KPI?.reprimands || 0}
            engagement={
              getPersonalRecognition?.feedbackReceived?.Engagement
                ?.reprimands || 0
            }
          />
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-6 flex flex-col gap-4">
          <IssuedAppreciation
            kpi={
              getPersonalRecognition?.feedbackIssued?.KPI?.appreciations || 0
            }
            engagement={
              getPersonalRecognition?.feedbackIssued?.Engagement
                ?.appreciations || 0
            }
          />
          <ReceivedAppreciation
            kpi={
              getPersonalRecognition?.feedbackReceived?.KPI?.appreciations || 0
            }
            engagement={
              getPersonalRecognition?.feedbackReceived?.Engagement
                ?.appreciations || 0
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Appreciation;
