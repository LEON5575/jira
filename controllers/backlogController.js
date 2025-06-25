const Backlog = require('../models/backlog');
const TeamMember = require('../models/teamMember');
const { sendBacklogAssignmentEmail } = require('../utils/nodemailerProject');

exports.createBacklog = async (req, res) => {
  try {
    const { summary, description, projectId, sprintId, assignees } = req.body;

    const backlog = new Backlog({
      summary,
      description,
      projectId,
      sprintId,
      assignees,
      // Add other fields like status, labels, etc. as needed
    });

    await backlog.save();

    // Send email to each assignee
    if (assignees && assignees.length > 0) {
      const memberIds = assignees.map(a => a.memberId);
      const members = await TeamMember.find({ _id: { $in: memberIds }, status: 1 });

      for (const member of members) {
        if (member.email) {
          await sendBacklogAssignmentEmail(member.email, summary);
        }
      }
    }

    res.status(201).json({ message: 'Backlog created and emails sent.', backlog });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create backlog item', details: err.message });
  }
};

// READ all Backlogs (optionally filter by sprint)
exports.getAllBacklogs = async (req, res) => {
  try {
    const filter = { level: 1 };
    if (req.query.sprintId) {
      filter.sprintId = req.query.sprintId;
    }
    const backlogs = await Backlog.find(filter);
    res.json(backlogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backlog items' });
  }
};

// READ single Backlog by ID
exports.getBacklogById = async (req, res) => {
  try {
    const backlog = await Backlog.findOne({ _id: req.params.id, level: 1 });
    if (!backlog) return res.status(404).json({ error: 'Backlog item not found' });
    res.json(backlog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backlog item' });
  }
};

//?get backlog by sprint
// Get All Backlogs for a Sprint
exports.getBacklogsBySprint = async (req, res) => {
  try {
    const backlogs = await Backlog.find({ sprintId: req.params.sprintId, level: 1 });
    res.json(backlogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backlogs' });
  }
};

// UPDATE Backlog
exports.updateBacklog = async (req, res) => {
  try {
    const backlog = await Backlog.findOneAndUpdate(
      { _id: req.params.id, level: 1 },
      req.body,
      { new: true, runValidators: true }
    );
    if (!backlog) return res.status(404).json({ error: 'Backlog item not found' });
    res.json(backlog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update backlog item' });
  }
};

// SOFT DELETE Backlog
exports.softDeleteBacklog = async (req, res) => {
  try {
    const backlog = await Backlog.findOne({ _id: req.params.id, level: 1 });
    if (!backlog) return res.status(404).json({ error: 'Backlog item not found or already deleted' });

    backlog.level = 5;
    await backlog.save();
    res.json({ message: 'Backlog  deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete backlog item' });
  }
};

// RESTORE Backlog
exports.restoreBacklog = async (req, res) => {
  try {
    const backlog = await Backlog.findOne({ _id: req.params.id, level: 5 });
    if (!backlog) return res.status(404).json({ error: 'Backlog item not found or not deleted' });

    backlog.level = 1;
    await backlog.save();
    res.json({ message: 'Backlog restored' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore backlog item' });
  }
};
