import { formatUserName } from '@/lib/format-user-name';
import { tokens } from '@/lib/design-tokens';
import {
  User as UserOutlined,
  Plus as PlusOutlined,
  X as CloseOutlined,
  ChevronDown as DownOutlined,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Col, Text, Button, Dropdown } from './shadcn-compat';

interface ParticipantsProps {
  leadParticipants: Array<{
    roleId: string;
    userId: string;
    isVisible?: boolean;
  }>;
  users: any[];
  getRoleOptions: () => any[];
  getUserOptions: () => any[];
  updateParticipantRole: (index: number, roleId: string) => void;
  updateParticipantUser: (index: number, userId: string) => void;
  addParticipantRow: () => void;
  validationErrors?: { [key: string]: string };
}

export default function Participants({
  leadParticipants,
  users,
  getRoleOptions,
  getUserOptions,
  updateParticipantRole,
  updateParticipantUser,
  addParticipantRow,
  validationErrors = {},
}: ParticipantsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({});

  // Custom getPopupContainer function - use document.body to prevent shaking during scroll
  const getPopupContainer = (): HTMLElement => {
    // Use document.body to prevent dropdown from shaking during horizontal scroll
    return document.body;
  };

  // Custom positioning strategy to prevent shaking
  const getDropdownProps = () => ({
    getPopupContainer,
    placement: 'bottomLeft' as const,
    trigger: ['click'] as ('click' | 'contextMenu' | 'hover')[],
    destroyPopupOnHide: true,
    // Add positioning strategy to prevent shaking
    align: {
      points: ['tl', 'bl'],
      offset: [0, 4],
    },
  });

  // Helper function to create role menu items
  const createRoleMenuItems = (index: number) => {
    const roleOptions = getRoleOptions();
    return roleOptions.map((role) => ({
      key: role.value,
      label: role.label,
      onClick: () => {
        updateParticipantRole(index, role.value);
        setOpenDropdowns((prev) => ({ ...prev, [`role-${index}`]: false }));
      },
    }));
  };

  // Helper function to create user menu items
  const createUserMenuItems = (index: number) => {
    const userOptions = getUserOptions();
    return userOptions.map((user) => ({
      key: user.value,
      label: user.label,
      onClick: () => {
        updateParticipantUser(index, user.value);
        setOpenDropdowns((prev) => ({ ...prev, [`user-${index}`]: false }));
      },
    }));
  };

  // Handle dropdown visibility
  const handleDropdownOpenChange = (key: string, open: boolean) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: open }));
  };

  // Add CSS to prevent dropdown overflow and handle scroll behavior
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ant-dropdown {
        max-width: 300px !important;
        max-height: 200px !important;
        overflow-y: auto !important;
        z-index: 1000 !important;
        position: fixed !important;
      }
      .participants-container {
        position: relative;
        overflow: visible !important;
        z-index: 1;
      }
      .participants-scroll {
        overflow-x: auto;
        overflow-y: visible;
        position: relative;
      }
      /* Hide dropdowns when scrolling horizontally */
      .participants-scroll.scrolling .ant-dropdown {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle scroll events to close dropdowns when scrolling horizontally
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Immediately close all open dropdowns when scrolling
      setOpenDropdowns({});

      // Add scrolling class to hide dropdowns
      scrollContainer.classList.add('scrolling');

      // Clear existing timeout
      clearTimeout(scrollTimeout);

      // Remove scrolling class after scroll ends
      scrollTimeout = setTimeout(() => {
        scrollContainer.classList.remove('scrolling');
      }, 100);
    };

    // Also handle window scroll events to close dropdowns
    const handleWindowScroll = () => {
      // Close all open custom dropdowns when window scrolls
      setOpenDropdowns({});
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  return (
    <Col xs={24} sm={12}>
      <div className="ml-2 mr-2">
        <Text type="secondary" className="text-sm font-medium mb-2 block">
          Roles
        </Text>
        <div className="mt-1">
          {/* Horizontal scrollable container with proper positioning context */}
          <div ref={containerRef} className="relative participants-container">
            {/* Overflow container for dropdowns */}
            <div className="relative overflow-visible">
              <div
                ref={scrollContainerRef}
                className="flex gap-1 participants-scroll pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-[60px]"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6',
                }}
              >
                {(leadParticipants || [])
                  .filter(
                    (p) => p.isVisible === undefined || p.isVisible !== false,
                  )
                  .map((participant) => {
                    // Find the original index in the unfiltered array using a more reliable method
                    const originalIndex = leadParticipants.findIndex((p) => {
                      // Use both reference equality and content matching for reliability
                      return (
                        p === participant ||
                        (p.roleId === participant.roleId &&
                          p.userId === participant.userId &&
                          p.isVisible === participant.isVisible)
                      );
                    });
                    return (
                      <div
                        key={originalIndex}
                        className="flex-shrink-0 p-1 min-w-[280px]"
                      >
                        {/* Role and User Selection - Side by Side */}
                        <div className="flex gap-1 items-center px-2 h-11">
                          {/* Role Selection */}
                          <div className="min-w-[100px] max-w-[120px]">
                            <Dropdown
                              menu={{
                                items: createRoleMenuItems(originalIndex),
                              }}
                              open={openDropdowns[`role-${originalIndex}`]}
                              onOpenChange={(open: boolean) =>
                                handleDropdownOpenChange(
                                  `role-${originalIndex}`,
                                  open,
                                )
                              }
                              {...getDropdownProps()}
                            >
                              <Button
                                className="h-11 w-full text-left flex items-center justify-between"
                                style={{
                                  border: validationErrors[
                                    `role-${originalIndex}`
                                  ]
                                    ? '1px solid #ff4d4f'
                                    : '1px solid #d9d9d9',
                                  borderRadius: '6px',
                                  backgroundColor: validationErrors[
                                    `role-${originalIndex}`
                                  ]
                                    ? tokens.color.errorMuted
                                    : tokens.color.surfaceCard,
                                  color: participant.roleId
                                    ? tokens.color.textPrimary
                                    : tokens.color.borderStrong,
                                  fontWeight: 'normal',
                                }}
                              >
                                <span className="truncate font-normal">
                                  {participant.roleId
                                    ? getRoleOptions().find(
                                        (role) =>
                                          role.value === participant.roleId,
                                      )?.label || 'Select Role'
                                    : 'Select Role'}
                                </span>
                                <DownOutlined className="text-xs ml-1 flex-shrink-0" />
                              </Button>
                            </Dropdown>
                          </div>

                          {/* User Selection */}
                          <div className="min-w-[140px]">
                            {participant.userId ? (
                              <div className="relative border border-gray-400 rounded-md bg-surface-card h-11 w-full shadow-sm px-2">
                                <div className="border border-border rounded-md bg-surface-card h-7 max-w-fit mx-auto my-2">
                                  <div className="flex items-center gap-1 px-2 py-1 h-full">
                                    <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                      <UserOutlined className="text-muted-foreground text-xs" />
                                    </div>
                                    <span className="text-foreground text-xs truncate max-w-[80px] flex-1 font-normal">
                                      {(() => {
                                        const user = users.find(
                                          (u: any) =>
                                            u.id === participant.userId,
                                        );
                                        return user
                                          ? formatUserName(user)
                                          : 'Unknown User';
                                      })()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateParticipantUser(originalIndex, '')
                                      }
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors flex-shrink-0 ml-1"
                                      data-cy={`remove-user-btn-${originalIndex}`}
                                      title="Remove user"
                                    >
                                      <CloseOutlined className="text-sm" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Dropdown
                                menu={{
                                  items: createUserMenuItems(originalIndex),
                                }}
                                open={openDropdowns[`user-${originalIndex}`]}
                                onOpenChange={(open: boolean) =>
                                  handleDropdownOpenChange(
                                    `user-${originalIndex}`,
                                    open,
                                  )
                                }
                                {...getDropdownProps()}
                              >
                                <Button
                                  className="h-11 w-full text-left flex items-center justify-between"
                                  style={{
                                    border: validationErrors[
                                      `user-${originalIndex}`
                                    ]
                                      ? '1px solid #ff4d4f'
                                      : '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                    backgroundColor: validationErrors[
                                      `user-${originalIndex}`
                                    ]
                                      ? tokens.color.errorMuted
                                      : tokens.color.surfaceCard,
                                    color: tokens.color.borderStrong,
                                    fontWeight: 'normal',
                                  }}
                                >
                                  <span className="truncate font-normal">
                                    Select User
                                  </span>
                                  <DownOutlined className="text-xs ml-1 flex-shrink-0" />
                                </Button>
                              </Dropdown>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Add New Role Button */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Button
                    type="text"
                    icon={
                      <PlusOutlined
                        className="text-lg"
                        style={{ color: tokens.color.brand }}
                      />
                    }
                    onClick={addParticipantRow}
                    className="h-11 w-11 flex items-center justify-center p-0 hover:bg-muted rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Empty State */}
            {(leadParticipants || []).length === 0 && (
              <div
                ref={scrollContainerRef}
                className="flex gap-1 overflow-x-auto pb-2 min-h-[60px]"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6',
                }}
              >
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Button
                    type="text"
                    icon={
                      <PlusOutlined
                        className="text-lg"
                        style={{ color: tokens.color.brand }}
                      />
                    }
                    onClick={addParticipantRow}
                    className="h-11 w-11 flex items-center justify-center p-0 hover:bg-muted rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Col>
  );
}
