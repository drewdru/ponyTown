import { EndPoints } from './admin';
import { AdminService } from '../services/adminService';

export class InternalAdminApi {
	constructor(private adminService: AdminService, private endPoints: EndPoints) {
	}
	removedDocument(model: 'events' | 'ponies' | 'accounts' | 'auths' | 'origins', id: string) {
		if (model in this.endPoints) {
			(this.endPoints as any)[model].removedItem(id);
		}
		this.adminService.removedItem(model, id);
		return Promise.resolve();
	}
}
