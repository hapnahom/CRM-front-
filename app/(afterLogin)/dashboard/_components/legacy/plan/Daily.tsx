import React from 'react';
import { Checkbox } from 'antd';
import { MdOutlineRadioButtonChecked } from 'react-icons/md';
// import { useUpdateStatus } from '@/store/server/features/okrPlanningAndReporting/mutations';
// import { useDefaultPlanningPeriods } from '@/store/server/features/okrPlanningAndReporting/queries';

const Daily = ({
  allPlannedTaskForReport,
}: {
  allPlannedTaskForReport: any[];
}) => {
  // const { planType } = useDashboardPlanStore(); // Commented out since not used

  // const { data: defaultPlanningPeriods } = useDefaultPlanningPeriods(); // Commented out due to missing module
  // const activePlanPeriod = defaultPlanningPeriods?.items?.find(
  //   (item: any) => item?.name === planType,
  // );

  // const { mutate: updateStatus } = useUpdateStatus(); // Commented out due to missing module

  // Placeholder data since modules are missing
  // const activePlanPeriod = { id: 'placeholder-id' }; // Commented out since not used
  const updateStatus = () => {
    // Placeholder function - no actual functionality
  };
  function groupByKeyResultIdToArray(data: any) {
    const map = new Map();

    data.forEach((item: any) => {
      const key = item.parentTaskId;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([parentTaskId, parentTask]) => ({
      parentTaskId,
      parentTask,
    }));
  }

  const planTaskArray =
    allPlannedTaskForReport &&
    groupByKeyResultIdToArray(allPlannedTaskForReport);

  const onChange = () =>
    // id: string, // Commented out since not used
    // status: string | null, // Commented out since not used
    // planningPeriodId?: string, // Commented out since not used
    {
      // updateStatus({
      //   id: id,
      //   status: status == 'pre-achieved' ? 'pending' : 'pre-achieved',
      //   planningPeriodId: planningPeriodId,
      // });
      updateStatus(); // Call placeholder function without arguments
    };
  return (
    <div className="h-[350px] overflow-y-auto scrollbar-track-primary scrollbar-none">
      {planTaskArray?.length > 0 ? (
        planTaskArray?.map((item: any) => (
          <div key={item?.parentTaskId} className="flex flex-col  pb-3">
            <div className="text-base font-bold flex gap-3 pb-3 items-center ">
              <MdOutlineRadioButtonChecked className="text-primary" />
              {item?.parentTask?.[0]?.parentTask?.task}
            </div>
            <div className="">
              {item?.parentTask?.map((task: any) => (
                <div className=" pb-2" key={task?.id}>
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

export default Daily;
