E2.p = E2.plugins["register_local_read"] = function(core, node)
{
	this.desc = 'Read from a local register using the name of the node.';
	
	this.input_slots = [];
	this.output_slots = [];
	
	this.state = 
	{
		slot_id: node.add_slot(E2.slot_type.output, { name: 'value', dt: core.datatypes.ANY, desc: '' })
	};
	
	this.node = node;
	this.data = null;
	
	if(!node.title)
		this.old_title = node.title = 'reg_' + node.uid;
};

E2.p.prototype.destroy = function()
{
	this.regs.unlock(this, this.node.title);
};

E2.p.prototype.renamed = function()
{
	this.regs.unlock(this, this.old_title);
	this.regs.lock(this, this.node.title);
};

E2.p.prototype.register_dt_changed = function(dt)
{
	this.node.change_slot_datatype(E2.slot_type.output, this.state.slot_id, dt);
};

E2.p.prototype.register_updated = function(value)
{
	this.updated = true;
	this.node.queued_update = 1; // Update next frame too...
	this.data = value;
};

E2.p.prototype.connection_changed = function(on, conn, slot)
{
	var reg_conn_count = this.regs.connection_changed(this.node.title, on);
	
	if(on && reg_conn_count === 1)
		this.regs.set_datatype(this.node.title, conn.dst_slot.dt);
};

E2.p.prototype.update_output = function(slot)
{
	return this.data;
};

E2.p.prototype.state_changed = function(ui)
{
	if(!ui)
	{
		var n = this.node;
		var id = n.title;

		this.regs = n.parent_graph.registers;
		this.regs.lock(this, id);
		this.regs.set_datatype(id, n.find_dynamic_slot(E2.slot_type.output, this.state.slot_id).dt);
		this.data = this.regs.registers[id].value;
	}
	else
		this.node.ui.dom.addClass('register');
};

