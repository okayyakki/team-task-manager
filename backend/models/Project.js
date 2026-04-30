const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Member'],
    default: 'Member'
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema]
}, { timestamps: true });

// Ensure creator is always in members as Admin
projectSchema.pre('save', function (next) {
  if (this.isNew) {
    const alreadyMember = this.members.some(
      m => m.user.toString() === this.createdBy.toString()
    );
    if (!alreadyMember) {
      this.members.push({ user: this.createdBy, role: 'Admin' });
    }
  }
  next();
});

// Virtual: get admin members
projectSchema.virtual('admins').get(function () {
  return this.members.filter(m => m.role === 'Admin').map(m => m.user);
});

module.exports = mongoose.model('Project', projectSchema);
