# Activity Export - XLSX Format

This module provides XLSX export functionality for lead activities.

## Features

- ✅ **XLSX Format Only**: Exports activities in Excel format (.xlsx)
- ✅ **New Endpoint**: Uses `GET /activities/leads/export/csv` (returns XLSX despite the name)
- ✅ **Binary Data Handling**: Properly handles ArrayBuffer/Blob responses
- ✅ **Automatic Download**: Downloads files directly to user's device
- ✅ **Filtering Support**: Supports date ranges and activity filters

## Usage

### Basic Export

```typescript
import { useExportActivitiesToXLSX } from '@/store/server/features/leads/activity/export';

const MyComponent = () => {
  const exportMutation = useExportActivitiesToXLSX();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        format: 'xlsx',
        includeDocuments: false,
      });

      // File will be automatically downloaded
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exportMutation.isLoading}
    >
      {exportMutation.isLoading ? 'Exporting...' : 'Export to XLSX'}
    </button>
  );
};
```

### Export with Filters

```typescript
const handleExportWithFilters = async () => {
  try {
    const result = await exportMutation.mutateAsync({
      format: 'xlsx',
      includeDocuments: true,
      filters: {
        leadId: 'some-lead-id',
        priority: 'high',
      },
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

### Combined Export and Download

```typescript
import { useExportAndDownloadActivities } from '@/store/server/features/leads/activity/export';

const MyComponent = () => {
  const { exportAndDownload, isLoading } = useExportAndDownloadActivities();

  const handleExportAndDownload = async () => {
    try {
      await exportAndDownload({
        format: 'xlsx',
        includeDocuments: false,
      });
      // File will be automatically downloaded
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <button onClick={handleExportAndDownload} disabled={isLoading}>
      {isLoading ? 'Exporting...' : 'Export & Download XLSX'}
    </button>
  );
};
```

## API Endpoint

- **URL**: `GET /activities/leads/export/csv`
- **Format**: XLSX (despite the URL name)
- **Response**: Binary data (ArrayBuffer/Blob)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `tenantId: <tenant-id>`

## File Format

The exported XLSX file includes the following columns:

- Lead ID
- Name
- Contact Person First Name
- Contact Person Last Name
- Contact Person Position
- Contact Person Email
- Contact Person Phone
- Company
- Sector
- Source
- Lead Type
- Engagement Stage
- Supplier
- Lead Rate
- Additional Information
- Solutions
- Created At
- Updated At
- Tenant ID

## Error Handling

The export functions include comprehensive error handling:

- **Network errors**: Displayed via `handleNetworkError`
- **Validation errors**: Displayed via `showValidationErrors`
- **Success messages**: Displayed via `handleSuccessMessage`

## Dependencies

- `utils/exportActivityToXlsx.ts`: XLSX download utilities
- `utils/crudRequest.ts`: API request handling
- `utils/constants.ts`: CRM_URL configuration
