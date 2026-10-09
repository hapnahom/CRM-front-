// import { useUpdateStatus } from '@/store/server/features/okrPlanningAndReporting/mutations';
// import { useDefaultPlanningPeriods } from '@/store/server/features/okrPlanningAndReporting/queries';
// import { useDashboardPlanStore } from '@/store/uistate/features/dashboard/plan'; // Commented out since not used
import { Checkbox } from 'antd';
import React from 'react';
import { BsKey } from 'react-icons/bs';

const Weekly = ({
  allPlannedTaskForReport,
}: {
  allPlannedTaskForReport: any[];
}) => {
  // const { mutate: updateStatus } = useUpdateStatus(); // Commented out due to missing module
  // const { planType } = useDashboardPlanStore(); // Commented out since not used

  // const { data: defaultPlanningPeriods } = useDefaultPlanningPeriods(); // Commented out due to missing module
  // const activePlanPeriod = defaultPlanningPeriods?.items?.find(
  //   (item: any) => item?.name === planType,
  // ); // Commented out due to missing module

  // Placeholder data since modules are missing
  const updateStatus = () => {};
  // const activePlanPeriod = { id: 'placeholder-id' }; // Commented out since not used
  function groupByKeyResultIdToArray(data: any) {
    const map = new Map();

    data.forEach((item: any) => {
      const key = item.keyResultId;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([keyResultId, task]) => ({
      keyResultId,
      task,
    }));
  }

  const planTaskArray =
    allPlannedTaskForReport &&
    groupByKeyResultIdToArray(allPlannedTaskForReport);

  const onChange = () => {
    // updateStatus({
    //   id: id,
    //   status: status == 'pre-achieved' ? 'pending' : 'pre-achieved',
    //   planningPeriodId: planningPeriodId,
    // }); // Commented out due to missing module
    updateStatus(); // Call placeholder function without arguments
  };
  return (
    <div className="h-[350px] overflow-y-auto scrollbar-track-primary scrollbar-none">
      {planTaskArray?.length > 0 ? (
        planTaskArray?.map((item: any) => (
          <div key={item?.keyResultId} className="flex flex-col pb-3">
            <div className="text-base font-bold flex gap-3 pb-3 items-center ">
              <BsKey className="text-primary" />
              {item?.task?.[0]?.keyResult?.title}
            </div>
            <div className="">
              {item?.task?.map((task: any) => (
                <div className="pb-2" key={task?.id}>
                  <Checkbox
                    checked={task?.status == 'pre-achieved'}
                    onChange={() => onChange()}
                    disabled={task?.status == 'completed'}
                  >
                    <div
                      className={`text-base font-medium text-slate-500 ${
                        task?.status == 'pre-achieved'
                          ? 'line-through text-slate-400'
                          : ''
                      }`}
                    >
                      {task?.task}
                    </div>
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-lg font-light flex h-full justify-center items-center ">
          Add your plans to view them here
        </div>
      )}
    </div>
  );
};

export default Weekly;
