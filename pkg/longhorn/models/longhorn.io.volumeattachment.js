import LonghornModel from './longhorn';

export default class VolumeAttachmentModel extends LonghornModel {
  get ticketRows() {
    const tickets = this.spec?.attachmentTickets || {};
    const statuses = this.status?.attachmentTicketStatuses || {};

    return Object.keys(tickets).map((key) => {
      const ticket = tickets[key];
      const status = statuses[key] || {};

      return {
        id: `${this.metadata.name}-${key}`,
        attachmentID: ticket.id || key,
        attachmentType: ticket.type || '—',
        nodeID: ticket.nodeID || '—',
        satisfied: status.satisfied ?? false,
        conditions: status.conditions || [],
        lastTransitionTime: status.conditions?.[0]?.lastTransitionTime || '—',
      };
    });
  }

  get volumeName() {
    return this.spec?.volume || this.metadata?.labels?.['longhornvolume'] || '';
  }
}
