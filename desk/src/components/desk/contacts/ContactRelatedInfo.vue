<template>
	<div class="flex h-full flex-col px-4">
		<ListManager
			ref="miniTicketList"
			:options="{
				doctype: 'HD Ticket',
				fields: [
					'_assign',
					'status',
					'priority',
					'subject',
					'ticket_type',
					'creation',
					'modified',
					'name',
					'_seen',
				],
				limit: 20,
				order_by: 'modified desc',
				filters: {
					contact: ['=', contact],
				},
			}"
		>
			<template #body="{ manager }">
				<ListViewer
					:options="{
						base: 24,
						fields: {
							name: {
								label: '#',
								width: '1',
							},
							subject: {
								label: 'Subject',
								width: '9',
							},
							status: {
								label: 'Status',
								width: '3',
							},
							ticket_type: {
								label: 'Type',
								width: '4',
							},
							priority: {
								label: 'Priority',
								width: '5',
							},
							creation: {
								label: 'Created',
								width: '2',
							},
							_assign: {
								label: ' ',
								width: '1',
								align: 'right',
							},
						},
					}"
					class="h-[93vh] pt-4 text-base"
				>
					<template #top-sub-section-1>
						<div class="py-2 text-xl font-semibold">Tickets</div>
					</template>
					<template #field-name="{ value }">
						<div class="text-xs text-gray-500">
							{{ value }}
						</div>
					</template>
					<template #field-subject="{ row }">
						<Subject :ticket="row" />
					</template>
					<template #field-status="{ value }">
						<TicketStatus :value="value" />
					</template>
					<template #field-priority="{ value }">
						<TicketPriority :value="value" />
					</template>
					<template #field-ticket_type="{ value }">
						<TicketType :value="value" />
					</template>
					<template #field-creation="{ value }">
						<Tooltip placement="top" :text="`Created on ${$dayjs(value)}`">
							<div class="text-gray-500">
								{{ $dayjs(value).format("DD MMM") }}
							</div>
						</Tooltip>
					</template>
					<template #field-modified="{ value }">
						<div class="text-gray-500">
							{{ $dayjs.shortFormating($dayjs(value).fromNow(), true) }}
						</div>
					</template>
					<template #field-_assign="{ value }">
						<AgentAvatar :agent="JSON.parse(value)[0]" />
					</template>

					<template #bulk-actions="{ selectedItems }">
						<div class="flex flex-row space-x-2">
							<Dropdown placement="right" :options="agentsAsDropdownOptions()">
								<template #default="{ toggleDropdown }">
									<Button
										:loading="$resources.bulkAssignTicketToAgent.loading"
										icon-right="chevron-down"
										class="ml-2"
										@click="toggleDropdown"
									>
										Assign to
									</Button>
								</template>
							</Dropdown>
							<!-- <Button @click="() => {}">Add to FAQ</Button> -->
							<Button
								@click="
									() => {
										$resources.bulkAssignTicketStatus
											.submit({
												ticket_ids: Object.keys(selectedItems),
												status: 'Closed',
											})
											.then(() => {
												manager.unselect();
												manager.reload();
											});
									}
								"
							>
								Close Ticket
							</Button>
						</div>
					</template>
				</ListViewer>
			</template>
		</ListManager>
	</div>
</template>

<script>
import { FeatherIcon, Dropdown, Tooltip } from "frappe-ui";
import ListManager from "@/components/global/ListManager.vue";
import ListViewer from "@/components/global/ListViewer.vue";
import AgentAvatar from "@/components/global/AgentAvatar.vue";
import TicketType from "@/components/global/ticket_list_item/TicketType.vue";
import TicketStatus from "@/components/global/ticket_list_item/TicketStatus.vue";
import TicketPriority from "@/components/global/ticket_list_item/TicketPriority.vue";
import Subject from "@/components/global/ticket_list_item/Subject.vue";
import { useAuthStore } from "@/stores/auth";
import { useAgentStore } from "@/stores/agent";

export default {
	name: "ContactRelatedInfo",
	components: {
		ListManager,
		ListViewer,
		AgentAvatar,
		FeatherIcon,
		Dropdown,
		Tooltip,
		TicketType,
		TicketStatus,
		TicketPriority,
		Subject,
	},
	props: ["contact"],
	setup() {
		const agentStore = useAgentStore();
		const authStore = useAuthStore();

		return {
			agentStore,
			authStore,
		};
	},
	methods: {
		agentsAsDropdownOptions() {
			let agentItems = [];
			if (this.agentStore.options) {
				this.agentStore.options.forEach((agent) => {
					agentItems.push({
						label: agent.agent_name,
						handler: () => {
							this.$resources.bulkAssignTicketToAgent.submit({
								ticket_ids: Object.keys(
									this.$refs.miniTicketList.manager.selectedItems
								),
								agent_id: agent.name,
							});
						},
					});
				});
				let options = [];
				if (this.authStore.isAgent) {
					options.push({
						group: "Myself",
						hideLabel: true,
						items: [
							{
								label: "Assign to me",
								handler: () => {
									this.$resources.bulkAssignTicketToAgent.submit({
										ticket_ids: Object.keys(
											this.$refs.miniTicketList.manager.selectedItems
										),
										agent_id: this.authStore.userId,
									});
								},
							},
						],
					});
				}
				options.push({
					group: "All Agents",
					hideLabel: true,
					items: agentItems,
				});
				return options;
			} else {
				return null;
			}
		},
	},
	resources: {
		bulkAssignTicketStatus() {
			return {
				url: "helpdesk.api.ticket.bulk_assign_ticket_status",
				onSuccess: (res) => {
					this.$refs.miniTicketList.manager.selectedItems = [];
					this.$refs.miniTicketList.manager.reload();

					this.$toast({
						title: `Tickets marked as ${res.status}.`,
						icon: "check",
						iconClasses: "text-green-500",
					});

					this.$event.emit("update_ticket_list");
				},
				onError: () => {
					this.$toast({
						title: "Unable to mark tickets as closed.",
						icon: "x",
						iconClasses: "text-red-500",
					});
				},
			};
		},
		bulkAssignTicketToAgent() {
			return {
				url: "helpdesk.api.ticket.bulk_assign_ticket_to_agent",
				onSuccess: () => {
					this.$refs.miniTicketList.manager.selectedItems = [];
					this.$refs.miniTicketList.manager.reload();

					this.$toast({
						title: "Tickets assigned to agent.",
						icon: "check",
						iconClasses: "text-green-500",
					});

					this.$event.emit("update_ticket_list");
				},
				onError: () => {
					this.$toast({
						title: "Unable to assign tickets to agent.",
						icon: "x",
						iconClasses: "text-red-500",
					});
				},
			};
		},
	},
};
</script>
