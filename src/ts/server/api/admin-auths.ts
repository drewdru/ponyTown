import { AdminService } from '../services/adminService';
import { Auth, Account } from '../db';
import { checkIfNotAdmin } from '../accountUtils';

export async function assignAuth(authId: string, accountId: string) {
	const auth = await Auth.findById(authId).exec();

	if (!auth)
		return;

	const [src, dest] = await Promise.all([
		Account.findById(auth.account).exec(),
		Account.findById(accountId).exec(),
	]);

	src && checkIfNotAdmin(src, `assign auth from ${src._id}`);
	dest && checkIfNotAdmin(dest, `assign auth to ${dest._id}`);

	await Auth.updateOne({ _id: authId }, { account: accountId }).exec();
}

export async function removeAuth(service: AdminService, authId: string) {
	const auth = await Auth.findById(authId).exec();

	if (!auth)
		return;

	if (auth.account) {
		const account = await Account.findById(auth.account).exec();
		account && checkIfNotAdmin(account, `remove auth from ${account._id}`);
	}

	await Auth.deleteOne({ _id: authId }).exec();

	service.auths.removed(authId);
}
